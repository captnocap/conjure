import * as THREE from 'three';
import { choice, defineThing, mix, noul } from '@conjure/kit';
import { Batch, type P3, vary } from './sav';

type Neck = 'up' | 'forward' | 'high' | 'down' | 'swing';
type Legs = 'stand' | 'walk' | 'splay' | 'fold';
interface Spec { size: number; neck: Neck; legs: Legs; yaw: number; hide: THREE.Color; pale: THREE.Color; dark: string; swing: number; birds: boolean }

/** One giraffe in adult metres, facing +x. `hide` faces are repainted with coat patches afterwards. */
function giraffe(spec: Spec, random: () => number) {
  const b = new Batch();
  const { hide, pale, dark } = spec;
  const lying = spec.legs === 'fold', drop = spec.legs === 'splay' ? 0.5 : 0, sink = lying ? -1.72 : 0;
  // Body: deep chest, sloping back, narrow rump.
  b.ball([0.5, 0.62, 0.4], [0.5, 2.5 - drop + sink, 0], hide, undefined, 22);
  b.ball([0.88, 0.48, 0.38], [-0.05, 2.38 - drop * 0.5 + sink, 0], hide, [0, 0, 0.2 - drop * 0.35], 22);
  b.ball([0.46, 0.5, 0.38], [-0.66, 2.2 + sink, 0], hide, undefined, 18);

  // Legs.
  const leg = (top: P3, knee: P3, foot: P3, thick: number) => {
    b.shaped([top, [(top[0] + knee[0]) / 2, (top[1] + knee[1]) / 2, (top[2] + knee[2]) / 2], knee], (t) => mix(thick, 0.075, t), hide, 8, undefined);
    b.ball([0.085, 0.085, 0.085], knee, pale, undefined, 8);
    b.rod(knee, foot, 0.068, 0.055, pale, 7);
    b.drum(0.08, 0.1, [foot[0], foot[1] + 0.05, foot[2]], dark, undefined, 7, 0.065);
  };
  if (lying) {
    for (const z of [-1, 1]) {
      leg([0.55, 0.5, z * 0.28], [1.05, 0.14, z * 0.34], [0.55, 0.06, z * 0.42], 0.13);
      leg([-0.6, 0.45, z * 0.3], [-0.1, 0.14, z * 0.46], [-0.7, 0.06, z * 0.52], 0.15);
    }
  } else {
    const s = spec.legs === 'walk' ? spec.swing : 0.06;
    [1, -1].forEach((z, i) => {
      const f = (i ? -s : s) * 0.75, h = (i ? s : -s) * 0.7;
      if (spec.legs === 'splay') leg([0.55, 2.25 - drop, z * 0.22], [0.68, 1.02, z * 0.66], [0.78, 0, z * 1.02], 0.13);
      else leg([0.55, 2.25, z * 0.2], [0.55 + f * 0.6, 1.1, z * 0.2], [0.55 + f, 0, z * 0.2], 0.13);
      leg([-0.62, 2.1, z * 0.22], [-0.74 + h * 0.5, 1.05, z * 0.22], [-0.68 + h, 0, z * 0.22], 0.16);
    });
  }

  // Tail.
  b.tube([[-1.05, 2.3 + sink, 0], [-1.22, 1.75 + sink * 0.9, 0.04], [-1.18, 1.3 + sink * 0.75, 0.08]], 0.045, 0.02, hide, 5);
  b.ball([0.05, 0.2, 0.05], [-1.17, 1.12 + sink * 0.75, 0.08], dark, undefined, 6);

  // Neck and head.
  const nx = 0.72, ny = 2.85 - drop + sink;
  const side = spec.yaw >= 0 ? 1 : -1;
  const tip: Record<Neck, P3> = {
    up: [nx + 0.75, ny + 2.0, 0],
    forward: [nx + 1.55, ny + 1.5, 0],
    high: [nx + 0.5, ny + 2.2, 0],
    down: [nx + 1.42, 0.42, 0],
    swing: [nx + 0.95, ny + 1.15, side * 1.3],
  };
  const end = new THREE.Vector3(...tip[spec.neck]), start = new THREE.Vector3(nx, ny, 0);
  const mid = start.clone().lerp(end, 0.5).add(spec.neck === 'down' ? new THREE.Vector3(0.28, 0.25, 0) : spec.neck === 'swing' ? new THREE.Vector3(0.2, 0.35, side * 0.25) : new THREE.Vector3(-0.12, 0.05, 0));
  const path: P3[] = [[nx - 0.25, ny - 0.4, 0], start.toArray() as unknown as P3, mid.toArray() as unknown as P3, end.toArray() as unknown as P3];
  b.shaped(path, (t) => mix(0.36, 0.13, t ** 0.75), hide, 12, undefined);
  // Mane: a dark ridge along the back of the neck.
  const back = new THREE.Vector3().subVectors(end, start).normalize().cross(new THREE.Vector3(0, 0, 1)).multiplyScalar(-1);
  if (back.x > 0) back.multiplyScalar(-1);
  b.shaped([start, mid, end].map((p, i) => p.clone().addScaledVector(back, [0.27, 0.2, 0.12][i]).toArray() as unknown as P3), () => 0.045, dark === '#1c1815' ? dark : '#6d4426', 5);

  const yaw = spec.neck === 'up' || spec.neck === 'high' ? spec.yaw : spec.neck === 'swing' ? side * 0.9 : 0;
  const pitch = { up: -0.3, forward: -0.15, high: 0.75, down: -1.0, swing: -0.4 }[spec.neck];
  const fwd = new THREE.Vector3(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(fwd, -fwd.y).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, up);
  const at = (f: number, u: number, r: number) => end.clone().addScaledVector(fwd, f).addScaledVector(up, u).addScaledVector(right, r).toArray() as unknown as P3;
  b.shaped([at(-0.12, 0, 0), at(0.15, 0.02, 0), at(0.6, -0.04, 0)], (t) => mix(0.16, 0.075, t), pale, 9);
  b.ball([0.085, 0.07, 0.08], at(0.6, -0.04, 0), dark === '#1c1815' ? dark : '#4a3628', undefined, 8);
  for (const r of [-1, 1]) {
    b.rod(at(0.02, 0.12, r * 0.065), at(-0.05, 0.36, r * 0.075), 0.03, 0.028, hide, 5);
    b.ball([0.04, 0.04, 0.04], at(-0.05, 0.38, r * 0.075), dark, undefined, 6);
    b.rod(at(-0.06, 0.1, r * 0.1), at(-0.12, 0.17, r * 0.3), 0.045, 0.012, pale, 4);
    b.ball([0.025, 0.025, 0.025], at(0.2, 0.07, r * 0.125), '#0f0c0a', undefined, 6);
  }
  if (spec.birds) {
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const perches = [new THREE.Vector3(-0.1, 2.92 - drop * 0.5 + sink, 0), new THREE.Vector3(-0.6, 2.74 + sink, 0.05), curve.getPoint(0.35).addScaledVector(back, 0.3), curve.getPoint(0.7).addScaledVector(back, 0.2)];
    for (const p of perches) if (random() < 0.7) {
      b.ball([0.1, 0.07, 0.06], [p.x, p.y + 0.05, p.z], '#6b5a3c', [0, 0, 0.3], 7);
      b.ball([0.045, 0.045, 0.045], [p.x + 0.1, p.y + 0.11, p.z], '#6b5a3c', undefined, 6);
      b.cone(0.022, 0.08, [p.x + 0.17, p.y + 0.11, p.z], '#e2382a', [0, 0, -1.57], 4);
    }
  }
  const mesh = b.mesh({ roughness: 0.9 });
  mesh.scale.setScalar(spec.size);
  return mesh;
}

export default defineThing({
  questions: {
    pose: choice('What are the two giraffes doing?', {
      crossed: 'Standing head to tail with their long necks crossed over one another in an X.',
      drinking: 'One has splayed its front legs wide and bent all the way down to a pool to drink; the other stands tall on watch.',
      browsing: 'Both stretching up, tongues out, to strip the top of the same spindly thorn sapling.',
      necking: 'Two bulls sparring: side by side, necks swung wide like slow clubs.',
      walking: 'Ambling in file, one behind the other, in that rocking slow-motion gait.',
      resting: 'One lies folded on the ground with its neck still upright; the other stands guard over it.',
    }),
    pair: choice('Who are they?', {
      adults: 'Two full-grown adults, near enough the same height.',
      calf: 'A mother and a leggy calf half her size.',
      bullcow: 'A towering dark old bull and a smaller, paler cow.',
    }),
    coat: choice('How do their coats read?', {
      silhouette: 'Pure dark silhouettes against a bright sky, no markings.',
      reticulated: 'Crisp chestnut polygons divided by a net of fine cream lines.',
      masai: 'Ragged dark-chocolate blotches like torn vine leaves on a tawny ground.',
      white: 'Ghost-pale, almost white, a rare leucistic pair with only a faint trace of pattern.',
    }),
    gaze: choice('Where are the upright heads looking?', {
      ahead: 'Straight ahead along their own noses, minding their business.',
      viewer: 'Both turned to stare straight at you, ears out.',
      together: 'At each other.',
      away: 'Back over their shoulders at something far off that you cannot see.',
    }),
    oxpeckers: noul('Are little red-billed oxpecker birds riding on their necks and backs?'),
  },

  build(a, context) {
    const { mood, random, seed } = context;
    const root = new THREE.Group();
    const extra = new Batch();
    const silhouette = a.coat === 'silhouette';
    const patch = new THREE.Color({ silhouette: '#2a2420', reticulated: '#9c5225', masai: '#6a4020', white: '#e9e1d0' }[a.coat]);
    const line = new THREE.Color({ silhouette: '#2a2420', reticulated: '#f0e4c6', masai: '#d9bd86', white: '#f6f1e6' }[a.coat]);
    if (!silhouette) { patch.lerp(new THREE.Color('#b0703a'), mood.warmth * 0.15).lerp(new THREE.Color('#8a8076'), mood.wear * 0.25); line.lerp(new THREE.Color('#b9ad98'), mood.wear * 0.3); }

    const hash = (x: number, y: number, z: number, n: number) => {
      let v = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683) ^ Math.imul(n + seed, 1274126177);
      v = Math.imul(v ^ (v >>> 13), 1274126177);
      return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
    };
    /** Repaint every face that carries the marker colour with a cracked-mud coat pattern. */
    const paint = (mesh: THREE.Mesh, marker: THREE.Color, tint: THREE.Color, salt: number, lying: boolean) => {
      const colour = mesh.geometry.getAttribute('color'), pos = mesh.geometry.getAttribute('position');
      const cell = a.coat === 'masai' ? 0.42 : 0.36, gapWidth = a.coat === 'masai' ? 0.07 : 0.045;
      const c = new THREE.Color();
      for (let v = 0; v < colour.count; v += 3) {
        if (Math.abs(colour.getX(v) - marker.r) > 1e-4 || Math.abs(colour.getY(v) - marker.g) > 1e-4 || Math.abs(colour.getZ(v) - marker.b) > 1e-4) continue;
        const px = (pos.getX(v) + pos.getX(v + 1) + pos.getX(v + 2)) / 3 / cell, py = (pos.getY(v) + pos.getY(v + 1) + pos.getY(v + 2)) / 3 / cell, pz = (pos.getZ(v) + pos.getZ(v + 1) + pos.getZ(v + 2)) / 3 / cell;
        const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
        let d1 = 9, d2 = 9, id = 0;
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
          const cx = ix + i, cy = iy + j, cz = iz + k;
          const d = Math.hypot(cx + hash(cx, cy, cz, salt) - px, cy + hash(cx, cy, cz, salt + 1) - py, cz + hash(cx, cy, cz, salt + 2) - pz);
          if (d < d1) { d2 = d1; d1 = d; id = hash(cx, cy, cz, salt + 3); } else if (d < d2) d2 = d;
        }
        const rag = a.coat === 'masai' ? (hash(Math.floor(px * 5), Math.floor(py * 5), Math.floor(pz * 5), salt + 4) - 0.5) * 0.22 : 0;
        const fade = THREE.MathUtils.smoothstep(py * cell, 0.9, 1.5); // patches fade out down the legs
        if (d2 - d1 < gapWidth / cell + rag || (!lying && fade < hash(ix, v, iz, salt + 5))) c.copy(line);
        else c.copy(tint).offsetHSL(0, 0, (id - 0.5) * 0.07);
        for (let k = 0; k < 3; k++) colour.setXYZ(v + k, c.r, c.g, c.b);
      }
      colour.needsUpdate = true;
    };

    const sizes = { adults: [1, mix(0.9, 0.97, random())], calf: [0.97, mix(0.48, 0.56, random())], bullcow: [1.1, 0.9] }[a.pair];
    const tints = { adults: [0, 0.03], calf: [0, 0.05], bullcow: [-0.09, 0.06] }[a.pair];
    type Place = { x: number; z: number; heading: number; neck: Neck; legs: Legs };
    const d = (sizes[0] + sizes[1]) / 2;
    const layout: [Place, Place] = ({
      crossed: [{ x: -1.05 * d, z: -0.42, heading: 0, neck: 'forward', legs: 'stand' }, { x: 1.05 * d, z: 0.42, heading: Math.PI, neck: 'forward', legs: 'stand' }],
      drinking: [{ x: -1.6, z: -1.5, heading: 0.35, neck: 'up', legs: 'stand' }, { x: -0.4, z: 0.9, heading: 0, neck: 'down', legs: 'splay' }],
      browsing: [{ x: -1.75 * d, z: 0.1, heading: 0, neck: 'high', legs: 'stand' }, { x: 1.75 * d, z: -0.2, heading: Math.PI, neck: 'high', legs: 'stand' }],
      necking: [{ x: -0.55, z: -0.6, heading: 0, neck: 'swing', legs: 'stand' }, { x: 0.55, z: 0.6, heading: Math.PI, neck: 'swing', legs: 'stand' }],
      walking: [{ x: 1.9, z: -0.2, heading: 0.05, neck: 'up', legs: 'walk' }, { x: -1.9 * d, z: 0.3, heading: -0.05, neck: 'up', legs: 'walk' }],
      resting: [{ x: -1.3, z: -0.9, heading: -0.3, neck: 'up', legs: 'stand' }, { x: 0.9, z: 0.7, heading: 0.35, neck: 'up', legs: 'fold' }],
    } as Record<typeof a.pose, [Place, Place]>)[a.pose];

    const holders: THREE.Group[] = [];
    layout.forEach((p, i) => {
      const other = layout[1 - i];
      const world = a.gaze === 'viewer' ? [0.35, 1] : a.gaze === 'together' ? [other.x - p.x, other.z - p.z] : a.gaze === 'away' ? [p.x - other.x - 0.5, p.z - other.z - 1] : null;
      let yaw = 0;
      if (world) {
        const lx = world[0] * Math.cos(p.heading) - world[1] * Math.sin(p.heading), lz = world[0] * Math.sin(p.heading) + world[1] * Math.cos(p.heading);
        yaw = THREE.MathUtils.clamp(Math.atan2(lz, lx), -1.35, 1.35);
      }
      if (p.neck === 'swing') yaw = 1; // both swing to their own left, toward each other
      const marker = new THREE.Color(0.5, 0.25 + i * 0.01, 0.125);
      const tint = patch.clone().offsetHSL(0, 0, silhouette ? 0 : tints[i]);
      const mesh = giraffe({ size: sizes[i], neck: p.neck, legs: p.legs, yaw, hide: marker, pale: silhouette ? patch : line, dark: silhouette ? '#1c1815' : '#3a2a1e', swing: mix(0.35, 0.8, mood.energy), birds: a.oxpeckers }, random);
      if (silhouette) paintFlat(mesh, marker, vary(patch, random, 0.02)); else paint(mesh, marker, tint, i * 17, p.legs === 'fold');
      const holder = new THREE.Group();
      holder.add(mesh);
      holder.position.set(p.x, 0, p.z);
      holder.rotation.y = p.heading + (random() - 0.5) * 0.08;
      root.add(holder);
      holders.push(holder);
    });

    if (a.pose === 'drinking') {
      const p = layout[1], s = sizes[1], wx = p.x + 2.3 * s, wz = p.z;
      const water = new THREE.Color('#6f93a3').lerp(new THREE.Color('#b08a5a'), mood.wear * 0.5 + mood.warmth * 0.15);
      extra.drum(1.5, 0.03, [wx + 0.5, 0.012, wz], vary('#8a6a4c', random, 0.05), undefined, 14);
      extra.drum(1.15, 0.03, [wx + 0.55, 0.022, wz + 0.05], water, undefined, 14);
      extra.drum(0.7, 0.03, [wx + 1.35, 0.022, wz - 0.5], water, undefined, 12);
      for (let i = 0; i < 9; i++) { const t = random() * 6.28, r = mix(1.5, 2, random()), c = vary('#b9ad62', random, 0.1); for (let k = 0; k < 3; k++) extra.cone(0.04, mix(0.4, 0.9, random()), [wx + 0.6 + Math.cos(t) * r + random() * 0.1, 0.25, wz + Math.sin(t) * r * 0.8], c, [(random() - 0.5) * 0.4, 0, (random() - 0.5) * 0.4], 4); }
    }
    if (a.pose === 'browsing') {
      const top = 5.0 * Math.max(sizes[0], sizes[1]) + 0.1, bark = '#5b4a3c', green = new THREE.Color('#5f8440').lerp(new THREE.Color('#8f8a55'), mood.wear * 0.6);
      extra.tube([[0.1, -0.1, -0.5], [-0.1, top * 0.5, -0.4], [0.05, top * 0.86, -0.25]], 0.1, 0.04, bark, 6);
      for (let i = 0; i < 7; i++) {
        const t = (i / 7) * 6.28 + random(), r = mix(0.5, 1.1, random()), y = top * mix(0.78, 1.0, random());
        extra.rod([0.02, top * 0.8, -0.28], [Math.cos(t) * r, y, -0.25 + Math.sin(t) * r * 0.7], 0.03, 0.012, bark, 4);
        extra.blob([0.42, 0.16, 0.42], [Math.cos(t) * r, y + 0.08, -0.25 + Math.sin(t) * r * 0.7], vary(green, random, 0.1), [0, random() * 3, 0], 1);
      }
    }
    // A little dry grass underfoot so they stand on something.
    for (let i = 0; i < 10 + mood.density * 10; i++) { const x = (random() - 0.5) * 6.5, z = (random() - 0.5) * 3.6, c = vary('#c8ae68', random, 0.1); for (let k = 0; k < 3; k++) extra.cone(0.035, mix(0.25, 0.55, random()), [x + random() * 0.12, 0.16, z + random() * 0.12], c, [(random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5], 4); }
    root.add(extra.mesh({ roughness: 0.85 }));

    // Centre on what stands here.
    const box = new THREE.Box3().setFromObject(root), centre = box.getCenter(new THREE.Vector3());
    root.position.set(-centre.x, 0, -centre.z);

    const pace = mix(0.4, 1.3, mood.energy);
    return {
      object: root,
      update: (_dt, time) => holders.forEach((holder, i) => { holder.rotation.z = Math.sin(time * pace + i * 2.1) * 0.012; }),
      dispose: () => {
        root.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        });
        root.removeFromParent();
      },
    };
  },
});

function paintFlat(mesh: THREE.Mesh, marker: THREE.Color, to: THREE.Color) {
  const colour = mesh.geometry.getAttribute('color');
  for (let v = 0; v < colour.count; v++) if (Math.abs(colour.getX(v) - marker.r) < 1e-4 && Math.abs(colour.getY(v) - marker.g) < 1e-4) colour.setXYZ(v, to.r, to.g, to.b);
  colour.needsUpdate = true;
}
